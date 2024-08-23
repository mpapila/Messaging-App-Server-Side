import express from 'express';
import { acceptFriend, acceptPendingList, addFriend, addUserList, exportCardInfo, healtCheck, userLogin, userRegister } from '../controller/UserController';
import { verifyToken } from '../middleware';


const router = express.Router();
router.post('/login', userLogin)
router.post('/register', userRegister)
router.get('/addUserList', verifyToken, addUserList)
router.get('/acceptPendingList', verifyToken, acceptPendingList)
router.post('/addFriend', verifyToken, addFriend)
router.post('/acceptFriend', verifyToken, acceptFriend)
router.get('/exportCardInfo', verifyToken, exportCardInfo)
router.get('/health-check', healtCheck)
export default router; addUserList