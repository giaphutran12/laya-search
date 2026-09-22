export default function status(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  response.status(200).json({
    laya: {ready: false, detail: 'Local Core ML is available only when running this app on a Mac.'},
    jev: {ready: Boolean(process.env.JEV_API_KEY || process.env.TYPESAFE_API_KEY), detail: process.env.JEV_API_KEY || process.env.TYPESAFE_API_KEY ? 'API key configured' : 'API key missing'},
  });
}
