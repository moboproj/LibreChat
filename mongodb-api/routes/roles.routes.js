const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { getRoles, createRole, updateRole, deleteRole } = require('../controllers/roles.controller');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/', getRoles);
router.post('/', createRole);
router.put('/:id', updateRole);
router.delete('/:id', deleteRole);

module.exports = router;
