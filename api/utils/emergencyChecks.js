const chestPainPhrases = [
    'chest pain', 'chest pains', 'chest hurts', 'my chest hurts',
    'pain in my chest', 'pains around my chest', 'pains around me chest',
    'tight chest', 'chest tightness', 'tightness in my chest',
    'pressure on my chest', 'chest pressure', 'heavy chest', 'crushing chest',
    'burning chest', 'issues with my chest', 'problem with my chest',
    'heart attack', 'pain in my left arm', 'pain in my jaw'
]

const chestPainWords = ['pain', 'hurt', 'tight', 'pressure', 'heavy', 'burning', 'squeez', 'ache', 'crushing']

const strokePhrases = [
    'face drooping', 'face is drooping', 'drooping face', 'face droop',
    'slurred speech', 'slurring', 'arm weakness', 'weak arm', 'arm is weak',
    'sudden confusion', 'suddenly confused', 'having a stroke', 'cant speak properly'
]

const breathingPhrases = [
    'trouble breathing', 'difficulty breathing', 'cant breathe', 'cannot breathe',
    'hard to breathe', 'struggling to breathe', 'short of breath', 'shortness of breath',
    'cant catch my breath', 'gasping', 'cant speak full sentences'
]

const selfHarmPhrases = [
    'kill myself', 'end my life', 'want to die', 'suicide', 'suicidal',
    'hurt myself', 'harm myself', 'self harm', 'better off dead',
    'no reason to live', 'dont want to live', 'dont want to be alive'
]

const medicalReply = 'What you describe can be a medical emergency, and I cannot assess it safely in a chat. Please get urgent medical help now: call your local emergency number or go to the nearest hospital. If you can, ask someone nearby to stay with you.'

const selfHarmReply = 'I am really sorry you are feeling this way, and I am glad you said it. Your safety matters most right now. Please reach out to someone now: call your local emergency number, or tell a person close to you and ask them to stay with you. If you can, move away from anything you could use to hurt yourself. You do not have to go through this alone.'


const questionStarters = [
    'what', 'whats', 'why', 'how', 'hows', 'when', 'which', 'can', 'could',
    'does', 'do', 'is', 'are', 'should', 'tell', 'explain', 'list', 'give', 'describe'
]

const personWords = [
    'i', 'im', 'ive', 'my', 'me', 'myself', 'someone', 'somebody',
    'he', 'hes', 'she', 'shes', 'they', 'him', 'her', 'his',
    'friend', 'mother', 'father', 'mom', 'dad', 'baby', 'child',
    'wife', 'husband', 'brother', 'sister'
]

const urgentPhrases = [
    'cardiac arrest', 'heart stopped', 'not breathing', 'stopped breathing',
    'unconscious', 'unresponsive', 'passed out', 'collapsed', 'fainted',
    'seizure', 'choking', 'severe bleeding', 'wont stop bleeding',
    'overdose', 'allergic reaction', 'throat is swelling', 'face is swelling'
]

const helpWords = [
    'signs', 'warning signs', 'symptoms', 'risk factors', 'prevent', 'prevention',
    'recognize', 'spot', 'notice'
]

function isGeneralQuestion(text) {
    const words = text.split(' ')
    return questionStarters.includes(words[0]) && !words.some((w) => personWords.includes(w))
}

function normalize(text) {
    return text
        .toLowerCase()
        .replace(/['’]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
}

function hasAny(text, phrases) {
    return phrases.some((p) => text.includes(p))
}

function checkMessage(message) {
    const text = normalize(message)

if (hasAny(text, selfHarmPhrases)) {
    const educational = isGeneralQuestion(text) && hasAny(text, helpWords)

    if (!educational) {
        return { kind: 'self_harm', reply: selfHarmReply }
    }

    return null
}

    if (isGeneralQuestion(text)) return null

    const chestCombo = text.includes('chest') && hasAny(text, chestPainWords)

    if (
        chestCombo ||
        hasAny(text, chestPainPhrases) ||
        hasAny(text, strokePhrases) ||
        hasAny(text, breathingPhrases) ||
        hasAny(text, urgentPhrases)
    ) {
        return { kind: 'medical', reply: medicalReply }
    }

    return null
}

function checkReadings(readings) {
    if (!Array.isArray(readings)) return null

    const cutoff = Date.now() - 24 * 60 * 60 * 1000

    for (const r of readings) {
        if (Date.parse(r.measuredAt) < cutoff) continue

        if (r.type === 'blood_pressure' && (r.systolic >= 180 || r.diastolic >= 120)) {
            return {
                kind: 'medical',
                reply: `Your blood pressure reading of ${r.systolic}/${r.diastolic} is in a range that needs urgent medical attention. Please get medical help now: call your local emergency number or go to the nearest hospital.`
            }
        }

        if (r.type === 'heart_rate' && (r.bpm > 130 || r.bpm < 40)) {
            return {
                kind: 'medical',
                reply: `Your heart rate reading of ${r.bpm} bpm is in a range that needs urgent medical attention. Please get medical help now: call your local emergency number or go to the nearest hospital.`
            }
        }
    }

    return null
}

function checkEmergency(message, readings) {
    return checkMessage(message) || checkReadings(readings)
}

module.exports = checkEmergency