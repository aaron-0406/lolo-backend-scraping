export type MessageType = {
  id: number;
  customerUserId: number;
  subject: string;
  body: string;
  wasRead: boolean;
  customerHasBankId: number;
  keyMessage: string;
  clientId: number;
  judicialCaseFileId: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
}

export type Body = {
  header: {
    title: string
    resolutionDate: string
    entryDate: any
    resolution: string
    fojas: string
    folios: any
  }
  sections: Array<{
    title: string
    content: string
  }>
  notifications: Array<{
    code: string
    addressee: string
    shipDate: string
    deliveryMethod: any
  }>
  url: string
}