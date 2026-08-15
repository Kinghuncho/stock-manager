import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import crypto from 'node:crypto';
import argon2 from 'argon2';
import { Pool } from 'pg';

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const SESSION_DAYS = 7;
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
const asyncRoute = fn => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);
const hashToken = value => crypto.createHash('sha256').update(value).digest('hex');
const required = (b, fields) => fields.filter(f => b[f] === undefined || b[f] === '');

app.get('/api/v1/health', (req,res) => res.json({ ok:true, service:'stock-manager-api', phase:'5.3' }));

async function createSession(userId) {
  const raw = crypto.randomBytes(32).toString('hex');
  await pool.query('INSERT INTO sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval \'7 days\')',[userId,hashToken(raw)]);
  return raw;
}
const auth = asyncRoute(async (req,res,next) => {
  const raw=req.cookies.sm_session; if(!raw)return res.status(401).json({error:'Authentication required'});
  const r=await pool.query('SELECT user_id FROM sessions WHERE token_hash=$1 AND expires_at>now()',[hashToken(raw)]);
  if(!r.rowCount)return res.status(401).json({error:'Session expired'}); req.userId=r.rows[0].user_id; next();
});
const membership = (roles=[]) => asyncRoute(async(req,res,next)=>{
  const r=await pool.query('SELECT role FROM store_memberships WHERE store_id=$1 AND user_id=$2',[req.params.storeId,req.userId]);
  if(!r.rowCount)return res.status(403).json({error:'Store access denied'});
  if(roles.length && !roles.includes(r.rows[0].role))return res.status(403).json({error:'Insufficient permissions'});
  req.storeRole=r.rows[0].role; next();
});

app.post('/api/v1/auth/register', asyncRoute(async(req,res)=>{
  const b=req.body; if(required(b,['name','email','password','storeName']).length || String(b.password).length<8)return res.status(422).json({error:'Name, email, storeName and an 8+ character password are required'});
  const c=await pool.connect(); try{await c.query('BEGIN'); const u=await c.query('INSERT INTO users(email,display_name,password_hash) VALUES($1,$2,$3) RETURNING id,email,display_name',[b.email.toLowerCase(),b.name,await argon2.hash(b.password)]); const s=await c.query('INSERT INTO stores(name) VALUES($1) RETURNING id,name',[b.storeName]); await c.query('INSERT INTO store_memberships(store_id,user_id,role) VALUES($1,$2,$3)',[s.rows[0].id,u.rows[0].id,'owner']); await c.query('COMMIT'); const token=await createSession(u.rows[0].id); res.cookie('sm_session',token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:SESSION_DAYS*86400000}); res.status(201).json({user:u.rows[0],store:s.rows[0]});}catch(e){await c.query('ROLLBACK');if(e.code==='23505')return res.status(409).json({error:'Email already exists'});throw e;}finally{c.release();}
}));
app.post('/api/v1/auth/login',asyncRoute(async(req,res)=>{const r=await pool.query('SELECT id,email,display_name,password_hash FROM users WHERE email=$1',[String(req.body.email||'').toLowerCase()]);if(!r.rowCount||!(await argon2.verify(r.rows[0].password_hash,req.body.password||'')))return res.status(401).json({error:'Invalid email or password'});const token=await createSession(r.rows[0].id);res.cookie('sm_session',token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:SESSION_DAYS*86400000});res.json({user:{id:r.rows[0].id,email:r.rows[0].email,displayName:r.rows[0].display_name}});}));
app.post('/api/v1/auth/logout',auth,asyncRoute(async(req,res)=>{await pool.query('DELETE FROM sessions WHERE token_hash=$1',[hashToken(req.cookies.sm_session)]);res.clearCookie('sm_session');res.status(204).end();}));
app.get('/api/v1/auth/me',auth,asyncRoute(async(req,res)=>{const r=await pool.query('SELECT id,email,display_name FROM users WHERE id=$1',[req.userId]);res.json({user:r.rows[0]});}));
app.get('/api/v1/auth/stores',auth,asyncRoute(async(req,res)=>{const r=await pool.query('SELECT s.id,s.name,sm.role FROM stores s JOIN store_memberships sm ON sm.store_id=s.id WHERE sm.user_id=$1 ORDER BY s.created_at',[req.userId]);res.json({stores:r.rows});}));

const productFields=b=>[b.name,b.category,Number(b.quantity||0),Number(b.lowStockLimit??5),Number(b.buyingPrice||0),Number(b.sellingPrice||0)];
app.get('/api/v1/stores/:storeId/products',auth,membership(),asyncRoute(async(req,res)=>{const r=await pool.query('SELECT * FROM products WHERE store_id=$1 ORDER BY created_at DESC',[req.params.storeId]);res.json({products:r.rows});}));
app.post('/api/v1/stores/:storeId/products',auth,membership(['owner','manager','staff']),asyncRoute(async(req,res)=>{const b=req.body;if(required(b,['name','category']).length||productFields(b).slice(2).some(n=>!Number.isFinite(n)||n<0))return res.status(422).json({error:'Invalid product data'});const r=await pool.query('INSERT INTO products(store_id,name,category,quantity,low_stock_limit,buying_price,selling_price) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[req.params.storeId,...productFields(b)]);res.status(201).json({product:r.rows[0]});}));
app.patch('/api/v1/stores/:storeId/products/:productId',auth,membership(['owner','manager','staff']),asyncRoute(async(req,res)=>{const b=req.body;if(required(b,['name','category']).length)return res.status(422).json({error:'Name and category are required'});const r=await pool.query('UPDATE products SET name=$1,category=$2,quantity=$3,low_stock_limit=$4,buying_price=$5,selling_price=$6,updated_at=now() WHERE id=$7 AND store_id=$8 RETURNING *',[...productFields(b),req.params.productId,req.params.storeId]);if(!r.rowCount)return res.status(404).json({error:'Product not found'});res.json({product:r.rows[0]});}));
app.delete('/api/v1/stores/:storeId/products/:productId',auth,membership(['owner','manager']),asyncRoute(async(req,res)=>{const r=await pool.query('DELETE FROM products WHERE id=$1 AND store_id=$2 RETURNING id',[req.params.productId,req.params.storeId]);if(!r.rowCount)return res.status(404).json({error:'Product not found'});res.status(204).end();}));

const dateOrToday = value => value || new Date().toISOString().slice(0, 10);
app.get('/api/v1/stores/:storeId/purchases', auth, membership(), asyncRoute(async (req,res)=>{const r=await pool.query('SELECT p.*,pr.name AS product_name FROM purchases p JOIN products pr ON pr.id=p.product_id WHERE p.store_id=$1 ORDER BY p.purchase_date DESC,p.created_at DESC',[req.params.storeId]);res.json({purchases:r.rows});}));
app.post('/api/v1/stores/:storeId/purchases',auth,membership(['owner','manager','staff']),asyncRoute(async(req,res)=>{const b=req.body,q=Number(b.quantity),cst=Number(b.unitCost);if(!b.productId||!Number.isInteger(q)||q<=0||!Number.isFinite(cst)||cst<0)return res.status(422).json({error:'Invalid purchase data'});const c=await pool.connect();try{await c.query('BEGIN');const p=await c.query('SELECT * FROM products WHERE id=$1 AND store_id=$2 FOR UPDATE',[b.productId,req.params.storeId]);if(!p.rowCount){await c.query('ROLLBACK');return res.status(404).json({error:'Product not found'});}await c.query('UPDATE products SET quantity=quantity+$1,buying_price=$2,updated_at=now() WHERE id=$3',[q,cst,b.productId]);const r=await c.query('INSERT INTO purchases(store_id,product_id,quantity,unit_cost,supplier,purchase_date,reference,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[req.params.storeId,b.productId,q,cst,b.supplier||null,dateOrToday(b.date),b.reference||null,req.userId]);await c.query('COMMIT');res.status(201).json({purchase:r.rows[0]});}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}));
app.get('/api/v1/stores/:storeId/sales',auth,membership(),asyncRoute(async(req,res)=>{const r=await pool.query('SELECT s.*,pr.name AS product_name FROM sales s JOIN products pr ON pr.id=s.product_id WHERE s.store_id=$1 ORDER BY s.sale_date DESC,s.created_at DESC',[req.params.storeId]);res.json({sales:r.rows});}));
app.post('/api/v1/stores/:storeId/sales',auth,membership(['owner','manager','staff']),asyncRoute(async(req,res)=>{const b=req.body,q=Number(b.quantity),price=Number(b.unitPrice);if(!b.productId||!Number.isInteger(q)||q<=0||!Number.isFinite(price)||price<0)return res.status(422).json({error:'Invalid sale data'});const c=await pool.connect();try{await c.query('BEGIN');const p=await c.query('SELECT * FROM products WHERE id=$1 AND store_id=$2 FOR UPDATE',[b.productId,req.params.storeId]);if(!p.rowCount){await c.query('ROLLBACK');return res.status(404).json({error:'Product not found'});}if(p.rows[0].quantity<q){await c.query('ROLLBACK');return res.status(409).json({error:'Insufficient stock',available:p.rows[0].quantity});}await c.query('UPDATE products SET quantity=quantity-$1,updated_at=now() WHERE id=$2',[q,b.productId]);const r=await c.query('INSERT INTO sales(store_id,product_id,quantity,unit_price,unit_cost,customer,sale_date,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[req.params.storeId,b.productId,q,price,Number(p.rows[0].buying_price),b.customer||null,dateOrToday(b.date),req.userId]);await c.query('COMMIT');res.status(201).json({sale:r.rows[0]});}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}));
app.get('/api/v1/stores/:storeId/expenses',auth,membership(),asyncRoute(async(req,res)=>{const r=await pool.query('SELECT * FROM expenses WHERE store_id=$1 ORDER BY expense_date DESC,created_at DESC',[req.params.storeId]);res.json({expenses:r.rows});}));
app.post('/api/v1/stores/:storeId/expenses',auth,membership(['owner','manager','staff']),asyncRoute(async(req,res)=>{const b=req.body,a=Number(b.amount);if(!b.name||!b.category||!Number.isFinite(a)||a<0)return res.status(422).json({error:'Invalid expense data'});const r=await pool.query('INSERT INTO expenses(store_id,name,category,amount,description,expense_date,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[req.params.storeId,b.name,b.category,a,b.description||null,dateOrToday(b.date),req.userId]);res.status(201).json({expense:r.rows[0]});}));

app.get('/api/v1/stores/:storeId/dashboard',auth,membership(),asyncRoute(async(req,res)=>{const sid=req.params.storeId;const [p,s,e]=await Promise.all([pool.query('SELECT count(*)::int AS products,coalesce(sum(quantity),0)::int AS units,coalesce(sum(quantity*buying_price),0)::numeric AS inventory_value,coalesce(sum(quantity*selling_price),0)::numeric AS potential_revenue FROM products WHERE store_id=$1',[sid]),pool.query('SELECT count(*)::int AS sales,coalesce(sum(quantity),0)::int AS units,coalesce(sum(quantity*unit_price),0)::numeric AS revenue FROM sales WHERE store_id=$1',[sid]),pool.query('SELECT count(*)::int AS expenses,coalesce(sum(amount),0)::numeric AS spending FROM expenses WHERE store_id=$1',[sid])]);res.json({inventory:p.rows[0],sales:s.rows[0],expenses:e.rows[0]});}));
app.get('/api/v1/stores/:storeId/reports',auth,membership(),asyncRoute(async(req,res)=>{const sid=req.params.storeId,from=req.query.from||'0001-01-01',to=req.query.to||'9999-12-31';const [sales,purchases,expenses]=await Promise.all([pool.query('SELECT s.*,p.name AS product_name FROM sales s JOIN products p ON p.id=s.product_id WHERE s.store_id=$1 AND s.sale_date BETWEEN $2 AND $3 ORDER BY s.sale_date DESC',[sid,from,to]),pool.query('SELECT p.*,pr.name AS product_name FROM purchases p JOIN products pr ON pr.id=p.product_id WHERE p.store_id=$1 AND p.purchase_date BETWEEN $2 AND $3 ORDER BY p.purchase_date DESC',[sid,from,to]),pool.query('SELECT * FROM expenses WHERE store_id=$1 AND expense_date BETWEEN $2 AND $3 ORDER BY expense_date DESC',[sid,from,to])]);const revenue=sales.rows.reduce((n,x)=>n+Number(x.quantity)*Number(x.unit_price),0),cogs=sales.rows.reduce((n,x)=>n+Number(x.quantity)*Number(x.unit_cost),0),purchaseSpend=purchases.rows.reduce((n,x)=>n+Number(x.total||Number(x.quantity)*Number(x.unit_cost)),0),expenseSpend=expenses.rows.reduce((n,x)=>n+Number(x.amount),0);res.json({range:{from,to},summary:{revenue,cogs,grossProfit:revenue-cogs,purchases:purchaseSpend,expenses:expenseSpend,netProfit:revenue-cogs-expenseSpend},sales:sales.rows,purchases:purchases.rows,expenses:expenses.rows});}));
app.use((err,req,res,next)=>{console.error(err);res.status(500).json({error:'Internal server error'});});
const port=Number(process.env.PORT||3000);app.listen(port,()=>console.log(`Stock Manager API Phase 5.3 listening on port ${port}`));
