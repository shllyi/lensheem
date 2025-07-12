// routes/item.js
const express = require('express');
const router = express.Router();
const upload = require('../utils/multer');
const itemController = require('../controllers/item');

// --------------------
// PUBLIC ROUTES
// --------------------
router.get('/', itemController.getAllItems);
router.get('/category/:categoryId', itemController.getItemsByCategory);

// --------------------
// ADMIN ROUTES
// --------------------
router.get('/admin', itemController.getAllItemsWithStock);
router.get('/admin/:id', itemController.getSingleItem);

// CREATE - single file upload for 'image' field
router.post('/admin', upload.single('image'), itemController.createItem);

// UPDATE - multiple file upload for 'images' field
router.put('/admin/:id', upload.array('images', 5), itemController.updateItem);

// DELETE
router.delete('/admin/:id', itemController.deleteItem);

module.exports = router;