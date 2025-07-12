const express = require('express');
const router = express.Router();
const upload = require('../utils/multer');
const { isAuthenticatedUser } = require('../middlewares/auth');

const {
  registerUser,
  loginUser,
  updateUser,
  deactivateUser,
  getCustomerProfile
} = require('../controllers/user');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/update-profile', isAuthenticatedUser, upload.single('image'), updateUser);
router.delete('/deactivate', deactivateUser);
router.get('/customers/:userId', getCustomerProfile);

module.exports = router;
