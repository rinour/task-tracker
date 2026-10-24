// ==============================================================================
// backend/src/routes/teams.js: Tuyến đường quản lý nhóm và thành viên
// ==============================================================================

const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', teamController.getTeams);
router.post('/', teamController.createTeam);
router.get('/:id', teamController.getTeamById);
router.put('/:id', teamController.updateTeam);
router.post('/:id/members', teamController.addMember);
router.put('/:id/members/:userId', teamController.updateMemberRole);
router.delete('/:id/members/:userId', teamController.removeMember);

module.exports = router;
