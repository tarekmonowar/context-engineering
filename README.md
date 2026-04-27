# Context Engineering Learning

This project is a simple practice repo for learning context engineering.

## What I learned

- Context trimming keeps only the most relevant recent messages.
- Context summarizing compresses older messages while keeping important details.
- These techniques help AI models work better with less token usage.

## Required Environment Variables

Create a `.env` file in the project root and add:

```env
OPENROUTER_KEY=your_openrouter_api_key
MODEL_ID=your_model_id
```

You can also use `OPENROUTER_API_KEY` instead of `OPENROUTER_KEY`.

## How to Clone

```bash
git clone https://github.com/tarekmonowar/context-engineering.git
cd context-engineering
```

## How to Use

```bash
npm install
npm run dev
```

## Available Scripts

- `npm run dev` - start the development server
- `npm run build` - create a production build
- `npm run preview` - preview the built app
