import React, { FC, useState } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { Hero } from "@/components/Leading/Hero";
import { FormsModal } from "@/components/Common/Modal";
import { Signup } from "@/components/Auth/Signup";
import { Navbar } from "@/components/Leading/Navbar";
import { Signin } from "@/components/Auth/Signin";

const App: FC = () => {
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const [signinModalOpen, setSigninModalOpen] = useState(false);
  return (
    <ThemeProvider attribute="class" defaultTheme={"dark"} enableSystem>
      <div className="h-screen max-w-[1550px] m-auto">
        <Navbar setSigninModalOpen={setSigninModalOpen} />
        <Hero setSignupModalOpen={setSignupModalOpen} />
        <FormsModal
          signupModalOpen={signupModalOpen}
          setSignupModalOpen={setSignupModalOpen}
          setSigninModalOpen={setSigninModalOpen}
          signinModalOpen={signinModalOpen}
        >
          {signinModalOpen && (
            <Signin setSigninModalOpen={setSigninModalOpen} />
          )}
          {signupModalOpen && (
            <Signup setSignupModalOpen={setSignupModalOpen} />
          )}
        </FormsModal>
      </div>
    </ThemeProvider>
  );
};

export default App;
