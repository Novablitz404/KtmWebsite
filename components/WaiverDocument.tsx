import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Register a nice font if possible, or use standard ones
// Font.register({ family: 'Inter', src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff' });

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontSize: 11,
        fontFamily: 'Helvetica',
        lineHeight: 1.5,
    },
    header: {
        fontSize: 16,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 20,
        marginTop: 10,
        textAlign: 'center',
        textTransform: 'uppercase',
    },
    paragraph: {
        marginBottom: 10,
        textAlign: 'justify',
    },
    listItem: {
        marginBottom: 10,
        flexDirection: 'row',
    },
    bullet: {
        width: 25,
        fontWeight: 'bold',
    },
    listContent: {
        flex: 1,
        textAlign: 'justify',
    },
    bold: {
        fontFamily: 'Helvetica-Bold',
    },
    footer: {
        marginTop: 30,
        borderTopWidth: 1,
        borderColor: '#000',
        paddingTop: 20,
    },
    signatureRow: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    signatureLabel: {
        width: 150,
        fontFamily: 'Helvetica-Bold',
    },
    signatureValue: {
        flex: 1,
        borderBottomWidth: 1,
        borderColor: '#000',
        paddingBottom: 2,
        fontFamily: 'Helvetica-Oblique',
    },
    signatureDate: {
        width: 60,
        fontFamily: 'Helvetica-Bold',
        marginLeft: 20,
    },
    dateValue: {
        width: 100,
        borderBottomWidth: 1,
        borderColor: '#000',
        paddingBottom: 2,
    },
    digitalStamp: {
        marginTop: 5,
        fontSize: 8,
        color: '#666',
        fontStyle: 'italic',
    }
});

interface WaiverDocumentProps {
    athleteName: string;
    tournamentName: string;
    registrationDate: Date | string;
}

const WaiverDocument = ({ athleteName, tournamentName, registrationDate }: WaiverDocumentProps) => {
    const dateStr = registrationDate instanceof Date
        ? registrationDate.toLocaleDateString()
        : String(registrationDate);

    const digitalSignature = `${athleteName} (Digitally Signed)`;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <Text style={styles.header}>WAIVER AND RELEASE OF LIABILITY</Text>

                <Text style={styles.paragraph}>
                    I, <Text style={styles.bold}>{athleteName}</Text>, hereby acknowledge and agree to the following terms and
                    conditions in consideration of being permitted to participate in the <Text style={styles.bold}>{tournamentName}</Text>.
                </Text>

                <View style={styles.listItem}>
                    <Text style={styles.bullet}>1.</Text>
                    <Text style={styles.listContent}>
                        <Text style={styles.bold}>Assumption of Risk:</Text> I understand and acknowledge that participating in Taekwondo involves
                        certain inherent risks, including but not limited to, bodily injury, physical strain, and emotional stress. I
                        voluntarily assume all risks associated with my participation in the competition.
                    </Text>
                </View>

                <View style={styles.listItem}>
                    <Text style={styles.bullet}>2.</Text>
                    <Text style={styles.listContent}>
                        <Text style={styles.bold}>Health and Fitness:</Text> I certify that I am physically and mentally fit to participate in the competition.
                        I acknowledge that it is my responsibility to consult with a physician prior to participating if I have any
                        concerns regarding my health or physical condition.
                    </Text>
                </View>

                <View style={styles.listItem}>
                    <Text style={styles.bullet}>3.</Text>
                    <Text style={styles.listContent}>
                        <Text style={styles.bold}>Release of Liability:</Text> In consideration of being permitted to participate in the competition, I hereby
                        release, waive, discharge, and covenant not to sue Elite Taekwondo Association of the Philippines, its
                        officers, directors, employees, agents, and representatives from any and all liability, claims, demands,
                        actions, and causes of action whatsoever arising out of or related to any loss, damage, or injury,
                        including death, that may be sustained by me during the competition.
                    </Text>
                </View>

                <View style={styles.listItem}>
                    <Text style={styles.bullet}>4.</Text>
                    <Text style={styles.listContent}>
                        <Text style={styles.bold}>Indemnification:</Text> I agree to indemnify and hold harmless TAP ELITE, its officers, directors,
                        employees, agents, and representatives from any and all liability, claims, demands, actions, and causes
                        of action arising out of or related to my participation in the competition.
                    </Text>
                </View>

                <View style={styles.listItem}>
                    <Text style={styles.bullet}>5.</Text>
                    <Text style={styles.listContent}>
                        <Text style={styles.bold}>Use of Likeness:</Text> I consent to the use of my name, likeness, voice, and/or appearance in any
                        photographs, videos, or other media recordings taken during the competition for promotional,
                        marketing, or educational purposes by TAP ELITE.
                    </Text>
                </View>

                <View style={styles.listItem}>
                    <Text style={styles.bullet}>6.</Text>
                    <Text style={styles.listContent}>
                        <Text style={styles.bold}>Governing Law:</Text> This waiver shall be governed by and construed in accordance with the laws of the
                        Philippines.
                    </Text>
                </View>

                <Text style={{ ...styles.paragraph, marginTop: 10 }}>
                    I have read this waiver and fully understand its terms. I understand that I am giving up substantial rights,
                    including my right to sue. I acknowledge that I am signing this waiver freely and voluntarily, and intend
                    by my signature to be a complete and unconditional release of all liability to the greatest extent allowed
                    by law.
                </Text>

                <View style={styles.footer}>

                    <View style={styles.signatureRow}>
                        <Text style={styles.signatureLabel}>Participant's Signature:</Text>
                        <Text style={styles.signatureValue}>{digitalSignature}</Text>
                    </View>

                    <View style={styles.signatureRow}>
                        <Text style={styles.signatureLabel}>Printed Name:</Text>
                        <Text style={styles.signatureValue}>{athleteName}</Text>
                    </View>

                    <View style={styles.signatureRow}>
                        <Text style={styles.signatureLabel}>Date:</Text>
                        <Text style={styles.dateValue}>{dateStr}</Text>
                    </View>

                    <View style={{ ...styles.signatureRow, marginTop: 20 }}>
                        <Text style={{ ...styles.signatureLabel, width: 250 }}>Parent's/Guardian's Name and Signature:</Text>
                        <Text style={styles.signatureValue}>(Required if under 18)</Text>
                    </View>

                    <Text style={styles.digitalStamp}>
                        * This document was digitally generated and signed upon registration for {tournamentName} on {dateStr}.
                    </Text>

                </View>
            </Page>
        </Document>
    );
};

export default WaiverDocument;
