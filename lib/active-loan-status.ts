export type LoanStatusInput = {
  status: string;
  outstandingBalance: number;
};

export function isOngoingLoanStatus(status: string) {
  return status === "active" || status === "overdue";
}

export function isCompletedLoanStatus(status: string) {
  return status === "paid" || status === "closed";
}

export function isCompletedLoan(loan: LoanStatusInput) {
  return isCompletedLoanStatus(loan.status) || loan.outstandingBalance <= 0;
}
