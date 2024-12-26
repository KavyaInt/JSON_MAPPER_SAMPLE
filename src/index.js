import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';  // If you have any global styles
import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';  // Ensure this is imported to use Bootstrap styles

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')  // Make sure there is a div with id "root" in your public/index.html
);
