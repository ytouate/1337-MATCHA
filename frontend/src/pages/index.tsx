import React, { FC, useState } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import LeadingPage from "./LeadingPage";
import Home from "./Home";

const App: FC = () => {
  const [isAuth, setAuth] = useState(false);
  return (
    <ThemeProvider attribute="class" defaultTheme={"dark"} enableSystem>
      {
        isAuth ?
        <Home /> :
        <LeadingPage />
      }
    </ThemeProvider>
  );
};

export default App;
