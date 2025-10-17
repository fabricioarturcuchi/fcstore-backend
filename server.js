const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const API_PREFIX = '/api';

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ensure uploads
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if(!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, UPLOAD_DIR); },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random()*1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  }
});
const upload = multer({ storage });

const DATA_FILE = path.join(__dirname, 'produtos.json');
function readProducts(){
  if(!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');
  try { return JSON.parse(fs.readFileSync(DATA_FILE)); } catch(e){ return []; }
}
function writeProducts(data){ fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }

app.get(API_PREFIX + '/products', (req, res) => {
  res.json(readProducts());
});

app.post(API_PREFIX + '/products', upload.single('image'), (req, res) => {
  try{
    const products = readProducts();
    const { name, category, price, tag } = req.body;
    const id = products.length ? Math.max(...products.map(p=>p.id)) + 1 : 1;
    const img = req.file ? `/uploads/${req.file.filename}` : (req.body.img || '');
    const product = { id, name, category, price: Number(price), tag, img };
    products.push(product);
    writeProducts(products);
    res.json({ ok:true, product });
  }catch(e){ res.status(500).json({ ok:false, error: e.message }); }
});

app.put(API_PREFIX + '/products/:id', upload.single('image'), (req, res) => {
  try{
    const products = readProducts();
    const id = Number(req.params.id);
    const idx = products.findIndex(p=>p.id===id);
    if(idx===-1) return res.status(404).json({ ok:false, error:'not found' });
    const { name, category, price, tag } = req.body;
    if(req.file) products[idx].img = `/uploads/${req.file.filename}`;
    if(name) products[idx].name = name;
    if(category) products[idx].category = category;
    if(price) products[idx].price = Number(price);
    if(tag) products[idx].tag = tag;
    writeProducts(products);
    res.json({ ok:true, product:products[idx] });
  }catch(e){ res.status(500).json({ ok:false, error: e.message }); }
});

app.delete(API_PREFIX + '/products/:id', (req, res) => {
  try{
    const products = readProducts();
    const id = Number(req.params.id);
    const filtered = products.filter(p=>p.id!==id);
    writeProducts(filtered);
    res.json({ ok:true });
  }catch(e){ res.status(500).json({ ok:false, error: e.message }); }
});

// order receiver - just logs and returns ok
app.post(API_PREFIX + '/orders', (req, res) => {
  const order = req.body;
  console.log('Novo pedido recebido:', JSON.stringify(order, null, 2));
  res.json({ ok:true });
});

app.listen(PORT, ()=>console.log(`Server running on port ${PORT}`));
