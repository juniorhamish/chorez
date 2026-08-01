import { GET as rescheduleGET, POST as reschedulePOST } from "../reschedule/route";

export async function GET(req: Request) {
  return rescheduleGET(req);
}

export async function POST(req: Request) {
  return reschedulePOST(req);
}
