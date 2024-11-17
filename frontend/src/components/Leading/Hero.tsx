import { Button } from "../ui/button";

export const Hero = ({
  setSignupModalOpen,
}: {
  setSignupModalOpen: (value: boolean) => void;
}) => {
  return (
    <div className="h-full flex flex-col items-center justify-center space-y-8 p-8 text-center">
      <h1 className="text-3xl md:text-5xl sm:text-xl text-bold font-bold">
        Find your perfect match from anywhere.
      </h1>
      <p className="text-sm max-w-[800px] md:text-xl">
        Discover meaningful connections from anywhere in the world. Join a
        community where genuine relationships are built, one match at a time.
      </p>
      <Button onClick={() => setSignupModalOpen(true)}>Get Started</Button>
    </div>
  );
};
