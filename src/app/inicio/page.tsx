import { CommunityHome } from "@/components/community-home";

export const metadata = { title: "Início | Pro Clubs America" };

export default function MemberHomePage() {
  return <CommunityHome requireAuth />;
}
