import { RegistrationPage } from "@/components/registration-page";
import { publicClubs } from "@/lib/public-data";

export const metadata = { title: "Cadastrar time | Clubs Brasil" };
export default function CadastroPage() { return <RegistrationPage indexedClubs={publicClubs.map(({ id, rawClubId, name, platform, crestUrl, sourceUrl, skillRating, rank }) => ({ id, rawClubId, name, platform, crestUrl, sourceUrl, skillRating, rank }))} />; }
