import { Dialog, DialogContent } from "@/components/ui/dialog";

export const Modal = ({
  children,
  setModalOpen,
  modalOpen,
}: {
  setModalOpen: (value: boolean) => void;
  modalOpen: boolean;
  children: React.ReactNode;
}) => {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  return (
    <Dialog modal onOpenChange={() => setModalOpen(false)} open={modalOpen}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onKeyDown={handleKeyDown}
        className="border-border max-h-[100vh] overflow-auto rounded-lg w-[95%]"
      >
        {children}
      </DialogContent>
    </Dialog>
  );
};
