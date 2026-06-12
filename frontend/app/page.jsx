import LandingPage from '@/features/auth/pages/LandingPage';

export default async function Home({ searchParams }) {
  const params = await searchParams;
  const initialLoginOpen = params?.login === 'true';

  return <LandingPage initialLoginOpen={initialLoginOpen} />;
}
