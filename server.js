const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const path = require('path');

const app = express();
const port = 3000;

// ========== CONFIGURATION ==========

// Cloudinary Config
cloudinary.config({ 
    cloud_name: 'drnmnrd8b', 
    api_key: '958257642588681', 
    api_secret: 'r7Hm8ZvalE2MLUO_asv3x8fxasg'
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'zghal-products',
        format: async (req, file) => 'jpg',
        public_id: (req, file) => file.originalname.split('.')[0] + '-' + Date.now(),
    },
});
const upload = multer({ storage: storage });

// Nodemailer Config (Email)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'bestbuyst100@gmail.com',
        pass: 'exgg uqww iadr igtw'
    }
});

// MongoDB Connection
const mongoURI = 'mongodb+srv://zghal_admin:ffaSY6OjfzBmZjVT@cluster0.s70syxd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
mongoose.connect(mongoURI)
    .then(() => console.log('تم الاتصال بقاعدة البيانات بنجاح!'))
    .catch(err => console.error('خطأ في الاتصال بقاعدة البيانات:', err));

// Mongoose Schema and Model
const productSchema = new mongoose.Schema({
    name: String,
    price: Number,
    description: String,
    imageUrl: String,
    public_id: String
});
const Product = mongoose.model('Product', productSchema);

// ========== MIDDLEWARE ==========
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ========== AUTHENTICATION (Simple) ==========
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';

const auth = (req, res, next) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        next();
    } else {
        res.status(401).send('Authentication failed');
    }
};

// ========== HTML & CSS PAGE ROUTES ==========
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/contact.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'contact.html')));
app.get('/vente.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'vente.html')));
app.get('/commander.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'commander.html')));
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/dashboard.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/edit-product.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'edit-product.html')));
app.get('/climatisation.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'climatisation.html')));
app.get('/chauffage.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'chauffage.html')));
app.get('/plomberie.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'plomberie.html')));
app.get('/chaudiere.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'chaudiere.html')));
app.get('/gaz.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'gaz.html')));
app.get('/reparation.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'reparation.html')));

// Serve CSS files explicitly
app.get('/style.css', (req, res) => res.sendFile(path.join(__dirname, 'public', 'style.css')));
app.get('/home-style.css', (req, res) => res.sendFile(path.join(__dirname, 'public', 'home-style.css')));
app.get('/service-page.css', (req, res) => res.sendFile(path.join(__dirname, 'public', 'service-page.css')));
app.get('/dashboard.css', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.css')));
app.get('/vente.css', (req, res) => res.sendFile(path.join(__dirname, 'public', 'vente.css')));


// ========== API ROUTES ==========

// LOGIN
app.post('/login', auth, (req, res) => {
    res.redirect('/dashboard.html');
});

// GET ALL PRODUCTS
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ADD A NEW PRODUCT
app.post('/api/products', upload.single('image'), async (req, res) => {
    try {
        const { name, price, description } = req.body;
        const newProduct = new Product({
            name, price, description,
            imageUrl: req.file.path,
            public_id: req.file.filename
        });
        await newProduct.save();
        res.status(201).json(newProduct);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de l\'ajout du produit' });
    }
});

// DELETE A PRODUCT
app.delete('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (product && product.public_id) {
            await cloudinary.uploader.destroy(product.public_id);
        }
        res.status(200).send('Produit supprimé');
    } catch (error) {
        res.status(500).send('Erreur serveur');
    }
});

// GET A SINGLE PRODUCT BY ID
app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Produit non trouvé' });
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Erreur du serveur' });
    }
});

// UPDATE A PRODUCT
app.put('/api/products/:id', upload.single('image'), async (req, res) => {
    try {
        const { name, price, description } = req.body;
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Produit non trouvé' });

        product.name = name;
        product.price = price;
        product.description = description;

        if (req.file) {
            if (product.public_id) await cloudinary.uploader.destroy(product.public_id);
            product.imageUrl = req.file.path;
            product.public_id = req.file.filename;
        }
        await product.save();
        res.json({ message: 'Produit mis à jour avec succès', product });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la mise à jour' });
    }
});

// SEND EMAIL (Devis & Commandes)
app.post('/send-email', (req, res) => {
    const { service, name, phone, city, notes, produit, livraison, adresse } = req.body;
    let subject, htmlContent;

    if (produit) { // Commande
        console.log('Nouvelle commande reçue:', req.body);
        subject = `Nouvelle Commande: ${produit}`;
        htmlContent = `
            <h3>Nouvelle Commande Reçue</h3>
            <p><strong>Produit:</strong> ${produit}</p>
            <p><strong>Nom du client:</strong> ${name}</p>
            <p><strong>Téléphone:</strong> ${phone}</p>
            <p><strong>Type de livraison:</strong> ${livraison}</p>
            ${livraison === 'Livraison à domicile' ? `<p><strong>Adresse:</strong> ${adresse}</p>` : ''}
        `;
    } else { // Devis
        console.log('Nouveau devis reçu:', req.body);
        subject = `Nouveau Devis pour: ${service}`;
        htmlContent = `
            <h3>Nouvelle Demande de Devis</h3>
            <p><strong>Service demandé:</strong> ${service}</p>
            <p><strong>Nom du client:</strong> ${name}</p>
            <p><strong>Téléphone:</strong> ${phone}</p>
            <p><strong>Ville:</strong> ${city}</p>
            <p><strong>Notes:</strong> ${notes || 'Aucune'}</p>
        `;
    }

    const mailOptions = {
        from: '"Zghal Climatisation Site" <bestbuyst100@gmail.com>',
        to: 'bestbuyst100@gmail.com',
        subject: subject,
        html: htmlContent
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(`Erreur lors de l'envoi de l'email:`, error);
            return res.status(500).send('Erreur serveur');
        }
        res.status(200).send('Email envoyé');
    });
});

// ========== START SERVER ==========
app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}` );
});
