//app/page.js
"use client";

import { useState } from "react";
import TechBackground from "./components/global/TechBackground";
import BindEmailScreen from "./components/screens/BindEmailScreen";

export default function Page() {
  const [email, setEmail] = useState("");

  const onSubmit = (e) => {
    e.preventDefault();
    alert("email=" + email);
  };

  return (
    <TechBackground>
      <BindEmailScreen email={email} setEmail={setEmail} onSubmit={onSubmit} />
    </TechBackground>
  );
}
