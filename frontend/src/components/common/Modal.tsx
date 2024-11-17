import { Dialog, DialogContent } from "@/components/ui/dialog";

export const FormsModal = ({
  children,
  setSignupModalOpen,
  signupModalOpen,
  setSigninModalOpen,
  signinModalOpen,
}: {
  setSignupModalOpen: (value: boolean) => void;
  signupModalOpen: boolean;
  children: React.ReactNode;
  setSigninModalOpen: (value: boolean) => void;
  signinModalOpen: boolean;
}) => {
  return (
    <Dialog
      onOpenChange={() => {
        if (signinModalOpen) setSigninModalOpen(false);
        if (signupModalOpen) setSignupModalOpen(false);
      }}
      open={signupModalOpen || signinModalOpen}
    >
      <DialogContent className="border-border max-h-[100vh] overflow-auto rounded-lg w-[95%]">
        {children}
      </DialogContent>
    </Dialog>
  );
};
