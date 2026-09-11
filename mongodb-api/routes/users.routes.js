const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
  getUsers,
  getUserById,
  getUserUsage,
  createUser,
  updateUser,
  updateUserPassword,
  deleteUser,
} = require('../controllers/users.controller');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id/password', updateUserPassword);
router.get('/:id/usage', getUserUsage);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
