import { DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { DialogDescription, DialogTitle } from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

export const EmailConfirmationModal = ({
  setOpen,
}: {
  setOpen: (value: boolean) => void;
}) => {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold">
          Verification Email Sent!
        </DialogTitle>
        <DialogDescription className="text-sm font-normal text-foreground">
          {`We've sent a verification email to your email address. Please
          check your inbox and click the verification link to activate your
          account.`}
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button onClick={() => setOpen(false)}>Close</Button>
      </DialogFooter>
    </>
  );
};
