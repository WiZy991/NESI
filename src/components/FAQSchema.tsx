import Script from 'next/script'

type FAQItem = {
	question: string
	answer: string
}

type FAQSchemaProps = {
	faqs: FAQItem[]
}

export default function FAQSchema({ faqs }: FAQSchemaProps) {
	const schema = {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: faqs.map(faq => ({
			'@type': 'Question',
			name: faq.question,
			acceptedAnswer: {
				'@type': 'Answer',
				text: faq.answer,
			},
		})),
	}

	return (
		<Script
			id='faq-schema'
			type='application/ld+json'
			dangerouslySetInnerHTML={{
				__html: JSON.stringify(schema),
			}}
		/>
	)
}

