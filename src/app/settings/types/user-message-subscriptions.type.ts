export type UserMessageSubscriptionsType = {
  id: number;
  customerUserId: number;
  customerHasBankId: number;
  isActiveSubscription: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
}