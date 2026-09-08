const fs = require('fs');

const cssPath = 'e:\\Master V\\M-client\\src\\features\\auth\\components\\login.css';
let oldContent = fs.readFileSync(cssPath, 'utf8');

const idx = oldContent.indexOf('/* FLIP ANIMATION */');
if (idx === -1) {
    console.log('Not found');
    process.exit(1);
}

const head = oldContent.substring(0, idx);
const tail = `/* FLIP ANIMATION */
.login-flip-wrapper {
    perspective: 1000px;
    width: 100%;
    height: 100%;
    position: relative;
}

.login-flipper {
    width: 100%;
    height: 100%;
    position: relative;
    transition: transform 0.6s;
    transform-style: preserve-3d;
}

.login-flipper.flipped {
    transform: rotateY(180deg);
}

.login-face {
    position: absolute;
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
    top: 0;
    left: 0;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    background: #fff;
    padding: 20px 0;
}

.login-face::before,
.login-face::after {
    content: "";
    margin: auto;
}

.login-front {
    z-index: 2;
    transform: rotateY(0deg);
}

.login-back {
    transform: rotateY(180deg);
}

/* Back Face Specifics */
.login-back-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: #333;
    margin-bottom: 8px;
    text-align: center;
}

.login-back-subtitle {
    font-size: 0.9rem;
    color: #666;
    margin-bottom: 24px;
    text-align: center;
}

.login-back-btn {
    background: transparent;
    color: #666;
    border: none;
    cursor: pointer;
    margin-top: 16px;
    text-decoration: underline;
    width: 100%;
    font-size: 0.9rem;
}

@media (max-width: 768px) {
    .login-flip-wrapper {
        height: auto;
        perspective: none;
    }

    .login-flipper,
    .login-flipper.flipped {
        height: auto;
        transform: none !important;
        transform-style: flat;
    }

    .login-face,
    .login-front,
    .login-back {
        position: static;
        width: 100%;
        height: auto;
        min-height: 0;
        padding: 0;
        overflow: visible;
        backface-visibility: visible;
        transform: none !important;
        justify-content: flex-start;
    }

    .login-front,
    .login-back {
        display: none;
    }

    .login-flipper:not(.flipped) .login-front,
    .login-flipper.flipped .login-back {
        display: flex;
    }
}
`;

fs.writeFileSync(cssPath, head + tail, 'utf8');
console.log('Done CSS Fix');
