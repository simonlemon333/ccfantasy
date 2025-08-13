import Welcome from '../components/Welcome';

export default function HomePage() {
  return (
    <>
      <Welcome username="JohnDoe" />
      <Welcome />
      <h1 className="text-4xl text-red-500">Tailwind Test</h1>
    </>
  );
}