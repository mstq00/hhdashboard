import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

export class AuthService {
    constructor() {
        if (!window.firebase?.auth) {
            console.error('Firebase Auth가 초기화되지 않았습니다.');
            return;
        }
        
        this.auth = window.firebase.auth;
        this.currentUser = null;
        console.log('AuthService 생성됨');
    }

    onAuthStateChanged(callback) {
        if (!this.auth) {
            console.error('Auth가 초기화되지 않았습니다.');
            return;
        }
        return this.auth.onAuthStateChanged((user) => {
            this.currentUser = user;
            callback(user);
        });
    }

    getCurrentUser() {
        return this.currentUser;
    }

    async signIn(email, password) {
        if (!this.auth) {
            throw new Error('Auth가 초기화되지 않았습니다.');
        }
        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            this.currentUser = userCredential.user;
            return userCredential;
        } catch (error) {
            console.error('로그인 실패:', error);
            throw error;
        }
    }

    async signOut() {
        if (!this.auth) {
            throw new Error('Auth가 초기화되지 않았습니다.');
        }
        try {
            await this.auth.signOut();
            this.currentUser = null;
        } catch (error) {
            console.error('로그아웃 실패:', error);
            throw error;
        }
    }
} 