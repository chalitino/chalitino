import { redirect } from "next/navigation";
export default async function OrdersRedirect({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  redirect(sp.placed ? `/account?placed=${sp.placed}#bestellingen` : "/account#bestellingen");
}
