import { useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  useEffect(() => {
    // Dynamically import your main.js file
    import('../src/main.js');
  }, []);

  return (
    <>
      <Head>
        <title>Agora Live Streaming</title>
        <meta name="description" content="Agora WebRTC Streaming" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div id="app"></div>
    </>
  );
}
