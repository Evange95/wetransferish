import { HttpTransferGateway } from '../infrastructure/api/HttpTransferGateway.js';
import { SendTransfer } from '../application/SendTransfer.js';
import { FetchTransferInfo } from '../application/FetchTransferInfo.js';

const gateway = new HttpTransferGateway();

export const sendTransfer = new SendTransfer(gateway, 3);
export const fetchTransferInfo = new FetchTransferInfo(gateway);
