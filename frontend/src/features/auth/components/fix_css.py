import os

css_path = r"e:\Master V\M-client\src\features\auth\components\login.css"
with open(css_path, "r", encoding="utf-8") as f:
    old_content = f.read()

idx = old_content.find("/* FLIP ANIMATION */")
if idx == -1:
    print("Not found")
    exit(1)

head = old_content[:idx]
tail = """/* FLIP ANIMATION */
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
"""

with open(css_path, "w", encoding="utf-8") as f:
    f.write(head + tail)
print("Done")
