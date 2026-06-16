import { format } from "date-fns";

export type DateProposalStatus =
  | "proposed"
  | "accepted"
  | "declined"
  | "cancelled";

export function formatScheduledAt(value: string): string {
  return format(new Date(value), "PPP p");
}

export function getSentDateStatusLabel(): string {
  return "Awaiting response";
}

export function getDateStatusLabel(status: string): string {
  switch (status) {
    case "proposed":
      return "Pending";
    case "accepted":
      return "Confirmed";
    case "declined":
      return "Declined";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export function getDateStatusClassName(status: string): string {
  switch (status) {
    case "proposed":
      return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100";
    case "accepted":
      return "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-100";
    case "declined":
      return "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100";
    case "cancelled":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function getPeerDisplayName(peer: {
  first_name: string;
  last_name: string;
}): string {
  return `${peer.first_name} ${peer.last_name}`;
}
