import React from "react";
import "./App.css";
import CerberusChat from "./organisms/CerberusChat";
import { API_URL } from "./config/env";

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Mi Aplicación React</h1>
        <p>Esta es una aplicación de ejemplo con Cerberus Chatbot integrado</p>
      </header>

      <main>
        <section>
          <h2>Contenido principal</h2>
          <p>Aquí iría el contenido principal de tu aplicación.</p>
        </section>
      </main>

      {/* Integración del chatbot */}
      <CerberusChat apiUrl={API_URL} position="bottom-right" />
    </div>
  );
}

export default App;
