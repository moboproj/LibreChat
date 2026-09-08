const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { getUsers, createUser, updateUser, updateUserPassword, deleteUser } = require('../controllers/users.controller');

const router = express.Router();

// All user routes require authentication AND admin privileges
router.use(requireAuth, requireAdmin);

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.put('/:id/password', updateUserPassword);
router.delete('/:id', deleteUser);

module.exports = router;
