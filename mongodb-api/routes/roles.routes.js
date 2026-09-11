const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
  getRoles,
  getRoleUsers,
  createRole,
  updateRole,
  deleteRole,
} = require('../controllers/roles.controller');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/', getRoles);
router.post('/', createRole);
router.get('/:id/users', getRoleUsers);
router.put('/:id', updateRole);
router.delete('/:id', deleteRole);

module.exports = router;
