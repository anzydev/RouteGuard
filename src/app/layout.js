import './globals.css';
import 'leaflet/dist/leaflet.css';

export const metadata = {
  title: 'Supply Chain Disruption Simulator — AI Decision Engine',
  description:
    'Interactive supply chain disruption simulator with real-time risk detection, cascade analysis, and AI-powered decision recommendations for rerouting, delaying, or splitting shipments.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
