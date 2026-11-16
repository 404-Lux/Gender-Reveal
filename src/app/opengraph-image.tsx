import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Baby Gender Reveal — A Paper & Light Virtual Gathering';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  const rawSurname = process.env.NEXT_PUBLIC_BABY_SURNAME;
  const surname = !rawSurname || rawSurname === 'Alonzo' ? 'Basio' : rawSurname;
  const rawCouple = process.env.NEXT_PUBLIC_COUPLE_NAMES;
  const couple =
    !rawCouple || rawCouple.includes('Alonzo')
      ? 'Jazzmine & Ruhmshynne Basio'
      : rawCouple;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F4EEE3',
          padding: '44px',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FBF8F2',
            border: '2px solid #C98A62',
            borderRadius: '28px',
            padding: '48px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 20,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: '#66745E',
              marginBottom: 18,
            }}
          >
            Virtual Gender Reveal · Philippine Standard Time
          </div>

          <div
            style={{
              fontSize: 74,
              fontWeight: 700,
              color: '#26302B',
              lineHeight: 1.08,
              marginBottom: 20,
            }}
          >
            Baby {surname}
          </div>

          <div
            style={{
              fontSize: 30,
              color: '#C98A62',
              fontStyle: 'italic',
              marginBottom: 28,
            }}
          >
            Hosted with love by {couple}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '14px 32px',
              borderRadius: '999px',
              backgroundColor: '#F4EEE3',
              border: '1px solid #C9CEC6',
              fontSize: 22,
              color: '#26302B',
            }}
          >
            Cast Your Guess · Seal a Wish · Pop the Balloons Live
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
