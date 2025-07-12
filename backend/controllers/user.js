const connection = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// ----------------- Register -----------------
const registerUser = async (req, res) => {
  const { name, password, email } = req.body;
  
  // ✅ Add validation
  if (!name || !password || !email) {
    return res.status(400).json({ 
      error: 'All fields are required (name, email, password)' 
    });
  }
  
  // ✅ Check if password is a string and not empty
  if (typeof password !== 'string' || password.trim().length === 0) {
    return res.status(400).json({ 
      error: 'Password must be a valid string' 
    });
  }
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userSql = 'INSERT INTO users (name, password, email) VALUES (?, ?, ?)';

    connection.execute(userSql, [name, hashedPassword, email], (err, result) => {
      if (err) {
        console.log('Database error:', err);
        
        // ✅ ADD THIS: Handle duplicate email error
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ 
            success: false,
            message: "Email already exists. Please use a different email." 
          });
        }
        
        // Handle other database errors
        return res.status(500).json({ 
          success: false,
          message: 'Database error occurred' 
        });
      }

      return res.status(200).json({ 
        success: true, 
        message: 'User registered successfully',
        result 
      });
    });
  } catch (error) {
    console.log('Hash error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Password hashing failed' 
    });
  }
};

// ----------------- Login -----------------
const loginUser = (req, res) => {
  const { email, password } = req.body;
  const sql = 'SELECT id, name, email, password FROM users WHERE email = ? AND deleted_at IS NULL';

  connection.execute(sql, [email], async (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: 'Error logging in', details: err });
    }
    if (results.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = results[0];
    const safePasswordHash = user.password.replace(/^\$2y\$/, '$2b$');
    const match = await bcrypt.compare(password, safePasswordHash);

    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    delete user.password;
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);

    return res.status(200).json({ success: "welcome back", user, token });
  });
};

// ----------------- Create or Update Profile -----------------
const updateUser = (req, res) => {
  const { title, fname, lname, addressline, town, phone, userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  const image = req.file ? req.file.path.replace(/\\/g, "/").replace("public/", "") : null;

  const checkSql = `SELECT customer_id FROM customer WHERE user_id = ?`;
  connection.execute(checkSql, [userId], (checkErr, checkResult) => {
    if (checkErr) {
      console.log("Check customer error:", checkErr);
      return res.status(500).json({ error: checkErr });
    }

    if (checkResult.length > 0) {
      // ✅ Update profile
      let updateSql, updateParams;

      if (image) {
        updateSql = `
          UPDATE customer SET 
            title = ?, 
            fname = ?, 
            lname = ?, 
            addressline = ?, 
            town = ?, 
            phone = ?, 
            image_path = ?
          WHERE user_id = ?`;
        updateParams = [title, fname, lname, addressline, town, phone, image, userId];
      } else {
        updateSql = `
          UPDATE customer SET 
            title = ?, 
            fname = ?, 
            lname = ?, 
            addressline = ?, 
            town = ?, 
            phone = ?
          WHERE user_id = ?`;
        updateParams = [title, fname, lname, addressline, town, phone, userId];
      }

      connection.execute(updateSql, updateParams, (updateErr, updateResult) => {
        if (updateErr instanceof Error) {
          console.log("Update error:", updateErr);
          return res.status(500).json({ error: updateErr });
        }

        return res.status(200).json({
          success: true,
          message: 'Profile updated successfully.',
          result: updateResult
        });
      });
    } else {
      // 🆕 Insert profile
      const insertSql = `
        INSERT INTO customer 
          (title, fname, lname, addressline, town, phone, image_path, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

      const insertParams = [title, fname, lname, addressline, town, phone, image, userId];

      connection.execute(insertSql, insertParams, (insertErr, insertResult) => {
        if (insertErr instanceof Error) {
          console.log("Insert error:", insertErr);
          return res.status(500).json({ error: insertErr });
        }

        return res.status(200).json({
          success: true,
          message: 'Profile created successfully.',
          result: insertResult
        });
      });
    }
  });
};

// ----------------- Deactivate User -----------------
const deactivateUser = (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const sql = 'UPDATE users SET deleted_at = ? WHERE email = ?';
  const timestamp = new Date();

  connection.execute(sql, [timestamp, email], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: 'Error deactivating user', details: err });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(200).json({
      success: true,
      message: 'User deactivated successfully',
      email,
      deleted_at: timestamp
    });
  });
};

// ----------------- Get Customer Profile -----------------
const getCustomerProfile = (req, res) => {
  const userId = req.params.userId;
  const sql = 'SELECT * FROM customer WHERE user_id = ?';

  connection.execute(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    if (results.length === 0) return res.status(404).json({ message: 'No profile found' });

    return res.status(200).json({ success: true, data: results[0] });
  });
};

module.exports = { registerUser, loginUser, updateUser, deactivateUser, getCustomerProfile };