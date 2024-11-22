export type MessageType = {
  id: number;
  customerUserId: number;
  subject: string;
  body: string;
  wasRead: boolean;
  customerHasBankId: number;
  keyMessage: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
}