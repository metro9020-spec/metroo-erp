import { auth } from "../db.js";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";

export function showFirebaseAuthScreen(container, onAuthSuccess) {
  container.innerHTML = "";
  
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: radial-gradient(circle, #f1f5f9 0%, #cbd5e1 100%);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    padding: 20px;
    box-sizing: border-box;
  `;
  container.appendChild(wrapper);

  const loginBox = document.createElement("div");
  loginBox.style.cssText = `
    width: 400px;
    background: #f8fafc;
    border: 2px solid #1e3b8b;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.15);
    overflow: hidden;
  `;
  wrapper.appendChild(loginBox);

  const header = document.createElement("div");
  header.style.cssText = `
    background: #1e3b8b;
    color: white;
    padding: 15px;
    text-align: center;
    font-size: 1.5rem;
    font-weight: bold;
  `;
  header.textContent = "System Login";
  loginBox.appendChild(header);

  const formContainer = document.createElement("div");
  formContainer.style.cssText = `
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 15px;
  `;
  loginBox.appendChild(formContainer);

  const errorDiv = document.createElement("div");
  errorDiv.style.cssText = `
    color: #b91c1c;
    font-size: 0.85rem;
    font-weight: bold;
    text-align: center;
    min-height: 20px;
  `;
  formContainer.appendChild(errorDiv);

  const emailInput = document.createElement("input");
  emailInput.type = "email";
  emailInput.placeholder = "Email";
  emailInput.style.cssText = `
    width: 100%;
    padding: 10px;
    border: 1px solid #94a3b8;
    border-radius: 4px;
    font-size: 1rem;
    box-sizing: border-box;
  `;
  formContainer.appendChild(emailInput);

  const passwordInput = document.createElement("input");
  passwordInput.type = "password";
  passwordInput.placeholder = "Password";
  passwordInput.style.cssText = `
    width: 100%;
    padding: 10px;
    border: 1px solid #94a3b8;
    border-radius: 4px;
    font-size: 1rem;
    box-sizing: border-box;
  `;
  formContainer.appendChild(passwordInput);

  const btnContainer = document.createElement("div");
  btnContainer.style.cssText = `
    display: flex;
    gap: 10px;
    margin-top: 10px;
  `;
  formContainer.appendChild(btnContainer);

  const loginBtn = document.createElement("button");
  loginBtn.textContent = "Login";
  loginBtn.style.cssText = `
    flex: 1;
    background: #3b82f6;
    color: white;
    border: none;
    padding: 10px;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
  `;
  loginBtn.onclick = async () => {
    errorDiv.textContent = "";
    try {
      await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
      if (onAuthSuccess) onAuthSuccess();
    } catch (err) {
      errorDiv.textContent = err.message;
    }
  };
  btnContainer.appendChild(loginBtn);

  const registerBtn = document.createElement("button");
  registerBtn.textContent = "Register";
  registerBtn.style.cssText = `
    flex: 1;
    background: #10b981;
    color: white;
    border: none;
    padding: 10px;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
  `;
  registerBtn.onclick = async () => {
    errorDiv.textContent = "";
    try {
      await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
      if (onAuthSuccess) onAuthSuccess();
    } catch (err) {
      errorDiv.textContent = err.message;
    }
  };
  btnContainer.appendChild(registerBtn);
}

export function performFirebaseLogout() {
  return signOut(auth);
}
