export type MessageType = {
  id: number;
  customerUserId: number;
  subject: string;
  body: string;
  whasRead: boolean;
  customerHasBankId: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
}