// =================================================================
//  السطر الأول والأهم: تحميل متغيرات البيئة من ملف .env
// =================================================================
require('dotenv').config();

// =================================================================
//  استيراد المكتبات (الأدوات) التي نحتاجها
// =================================================================
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { MongoClient, ObjectId } = require('mongodb');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const { Resend } = require('resend');

// =================================================================
//  الإعدادات الأولية
// =================================================================
const app = express();
const port = process.env.PORT || 3000;
const publicPath = path.join(__dirname, 'public');

// --- إعدادات قاعدة البيانات MongoDB ---
const MONGODB_URI = process.env.MONGODB_URI;
const client = new MongoClient(MONGODB_URI);
let db;

// --- إعدادات رفع الصور إلى Cloudinary ---
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'zghal-products',
        format: async (req, file) => 'jpg',
        public_id: (req, file) => Date.now() + '-' + file.originalname,
    },
});
const upload = multer({ storage: storage });

// --- إعدادات إرسال الإيميلات عبر Resend ---
const resend = new Resend(process.env.RESEND_API_KEY);
const clientEmail = process.env.CLIENT_EMAIL;

// =================================================================
//  Middlewares (برامج وسيطة لتجهيز الطلبات)
// =================================================================
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(publicPath));

// =================================================================
//  الاتصال بقاعدة البيانات وتشغيل الخادم
// =================================================================
async function connectDB() {
    try {
        await client.connect();
        db = client.db('zghal-database');
        console.log('تم الاتصال بقاعدة البيانات بنجاح!');
        app.listen(port, () => {
            console.log(`الخادم يعمل الآن على http://localhost:${port}` );
        });
    } catch (err) {
        console.error('خطأ في الاتصال بقاعدة البيانات:', err);
        process.exit(1);
    }
}

connectDB();

// =================================================================
//  API Routes (مسارات التعامل مع البيانات)
// =================================================================

// --- مسارات لوحة التحكم (Admin) ---
app.post('/login', async (req, res) => {
    // --- 1. المعلومات التي أرسلتها أنت من المتصفح ---
    const userInput = req.body;
    console.log("------------------------------------");
    console.log("1. البيانات المستلمة من المتصفح:");
    console.log(userInput);

    // --- 2. المعلومات الصحيحة المخزنة في ملف .env ---
    const correctCredentials = {
        user: process.env.ADMIN_USER,
        pass: process.env.ADMIN_PASS
    };
    console.log("2. البيانات الصحيحة من ملف .env:");
    console.log(correctCredentials);

    // --- 3. عملية المقارنة ---
    const isMatch = (userInput.username === correctCredentials.user && userInput.password === correctCredentials.pass);
    console.log("3. هل البيانات متطابقة؟:", isMatch);
    console.log("------------------------------------");

    // --- 4. إرسال الرد ---
    if (isMatch) {
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

app.get('/api/products', async (req, res) => {
    try {
        const products = await db.collection('products').find({}).toArray();
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching products' });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const product = await db.collection('products').findOne({ _id: new ObjectId(id) });
        if (!product) {
            return res.status(404).json({ message: 'Produit non trouvé' });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération du produit' });
    }
});

app.post('/api/products', upload.single('image'), async (req, res) => {
    try {
        const { name, description, price } = req.body;
        const imageUrl = req.file.path;
        const newProduct = { name, description, price: parseFloat(price), imageUrl };
        await db.collection('products').insertOne(newProduct);
        res.status(201).json(newProduct);
    } catch (error) {
        res.status(500).json({ message: 'Error adding product' });
    }
});

app.put('/api/products/:id', upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price } = req.body;
        const updateData = { name, description, price: parseFloat(price) };
        if (req.file) {
            updateData.imageUrl = req.file.path;
        }
        await db.collection('products').updateOne({ _id: new ObjectId(id) }, { $set: updateData });
        res.json({ message: 'Product updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating product' });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection('products').deleteOne({ _id: new ObjectId(id) });
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting product' });
    }
});

// --- مسارات نماذج الاتصال والطلبات ---
app.post('/send-devis', async (req, res) => {
    const { service, name, phone, city, notes } = req.body;
    try {
        const { data, error } = await resend.emails.send({
            from: 'Zghal Site <onboarding@resend.dev>',
            to: clientEmail,
            subject: `Nouveau Devis pour: ${service}`,
            html: `<p>Service: ${service}, Nom: ${name}, Tél: ${phone}, Ville: ${city}, Notes: ${notes}</p>`
        });
        if (error) {
            console.error("Erreur retournée par Resend (Devis):", error);
            return res.status(500).send('Une erreur est survenue.');
        }
        console.log("Réponse de Resend (Devis):", data);
        res.status(200).send('Devis envoyé avec succès.');
    } catch (generalError) {
        console.error("Erreur générale lors de l'envoi de l'email de devis:", generalError);
        res.status(500).send('Une erreur est survenue.');
    }
});

app.post('/send-commande', async (req, res) => {
    const { produit, name, phone, livraison, adresse } = req.body;
    try {
        const { data, error } = await resend.emails.send({
            from: 'Zghal Site <onboarding@resend.dev>',
            to: clientEmail,
            subject: `Nouvelle Commande: ${produit}`,
            html: `<p>Produit: ${produit}, Nom: ${name}, Tél: ${phone}, Option: ${livraison}, Adresse: ${adresse || 'N/A'}</p>`
        });
        if (error) {
            console.error("Erreur retournée par Resend (Commande):", error);
            return res.status(500).send('Une erreur est survenue.');
        }
        console.log("Réponse de Resend (Commande):", data);
        res.status(200).send('Commande envoyée avec succès.');
    } catch (generalError) {
        console.error("Erreur générale lors de l'envoi de l'email de commande:", generalError);
        res.status(500).send('Une erreur est survenue.');
    }
});

// =================================================================
//  Routes لخدمة الصفحات (Serving HTML Pages)
// =================================================================
app.get('/', (req, res) => res.sendFile(path.join(publicPath, 'index.html')));
app.get('/contact.html', (req, res) => res.sendFile(path.join(publicPath, 'contact.html')));
app.get('/vente.html', (req, res) => res.sendFile(path.join(publicPath, 'vente.html')));
app.get('/commander.html', (req, res) => res.sendFile(path.join(publicPath, 'commander.html')));
app.get('/climatisation.html', (req, res) => res.sendFile(path.join(publicPath, 'climatisation.html')));
app.get('/chauffage.html', (req, res) => res.sendFile(path.join(publicPath, 'chauffage.html')));
app.get('/plomberie.html', (req, res) => res.sendFile(path.join(publicPath, 'plomberie.html')));
app.get('/gaz.html', (req, res) => res.sendFile(path.join(publicPath, 'gaz.html')));
app.get('/electromenager.html', (req, res) => res.sendFile(path.join(publicPath, 'electromenager.html')));
app.get('/chaudiere.html', (req, res) => res.sendFile(path.join(publicPath, 'chaudiere.html')));
app.get('/login.html', (req, res) => res.sendFile(path.join(publicPath, 'login.html')));
app.get('/dashboard.html', (req, res) => res.sendFile(path.join(publicPath, 'dashboard.html')));
app.get('/edit-product.html', (req, res) => res.sendFile(path.join(publicPath, 'edit-product.html')));


// =================================================================
//  Middleware للتعامل مع الروابط غير الموجودة (404)
// =================================================================