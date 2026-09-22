import companies from '../data/companies.json' with {type: 'json'};

export default function companiesRoute(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  response.status(200).json({companies, total: companies.length});
}
