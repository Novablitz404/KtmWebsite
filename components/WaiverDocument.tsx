import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
    page: {
        padding: 30, // Reduced padding to ensure single page
        fontSize: 10, // Slightly smaller font
        fontFamily: 'Helvetica',
        lineHeight: 1.4,
    },
    header: {
        fontSize: 14,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 15,
        marginTop: 5,
        textAlign: 'center',
        textTransform: 'uppercase',
    },
    paragraph: {
        marginBottom: 8,
        textAlign: 'justify',
    },
    listItem: {
        marginBottom: 8,
        flexDirection: 'row',
    },
    bullet: {
        width: 20,
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
        marginTop: 20,
        borderTopWidth: 1,
        borderColor: '#000',
        paddingTop: 15,
    },
    signatureRow: {
        flexDirection: 'row',
        marginBottom: 15,
        alignItems: 'flex-end', // Align bottom for signature line
    },
    signatureLabel: {
        width: 130,
        fontFamily: 'Helvetica-Bold',
        fontSize: 9,
    },
    signatureArea: {
        flex: 1,
        borderBottomWidth: 1,
        borderColor: '#000',
        paddingBottom: 2,
        height: 40, // Height for signature
        justifyContent: 'flex-end',
    },
    signatureImage: {
        height: 35,
        objectFit: 'contain',
    },
    signatureValue: {
        fontFamily: 'Helvetica-Oblique',
        fontSize: 9,
    },
    signatureDate: {
        width: 50,
        fontFamily: 'Helvetica-Bold',
        marginLeft: 15,
        fontSize: 9,
    },
    dateValue: {
        width: 80,
        borderBottomWidth: 1,
        borderColor: '#000',
        paddingBottom: 2,
        fontSize: 9,
    },
    digitalStamp: {
        marginTop: 10,
        fontSize: 7,
        color: '#666',
        fontStyle: 'italic',
        textAlign: 'center',
    }
});

interface WaiverDocumentProps {
    athleteName: string;
    tournamentName: string;
    registrationDate: Date | string;
    signatureImage?: string;
}

const WaiverDocument = ({ athleteName, tournamentName, registrationDate, signatureImage }: WaiverDocumentProps) => {
    const dateStr = registrationDate instanceof Date
        ? registrationDate.toLocaleDateString()
        : String(registrationDate);

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

                <Text style={{ ...styles.paragraph, marginTop: 5 }}>
                    I have read this waiver and fully understand its terms. I understand that I am giving up substantial rights,
                    including my right to sue. I acknowledge that I am signing this waiver freely and voluntarily, and intend
                    by my signature to be a complete and unconditional release of all liability to the greatest extent allowed
                    by law.
                </Text>

                <View style={styles.footer}>

                    <View style={styles.signatureRow}>
                        <Text style={styles.signatureLabel}>Participant's Signature:</Text>
                        <View style={styles.signatureArea}>
                            {signatureImage ? (
                                <Image src={signatureImage} style={styles.signatureImage} />
                            ) : (
                                <Text style={styles.signatureValue}>(Not Signed)</Text>
                            )}
                        </View>
                    </View>

                    <View style={styles.signatureRow}>
                        <Text style={styles.signatureLabel}>Printed Name:</Text>
                        <View style={styles.signatureArea}>
                            <Text style={styles.signatureValue}>{athleteName}</Text>
                        </View>
                    </View>

                    <View style={styles.signatureRow}>
                        <Text style={styles.signatureLabel}>Date:</Text>
                        <View style={styles.dateValue}>
                            <Text style={styles.signatureValue}>{dateStr}</Text>
                        </View>
                    </View>

                    <View style={{ ...styles.signatureRow, marginTop: 15 }}>
                        <Text style={{ ...styles.signatureLabel, width: 220 }}>Parent's/Guardian's Name and Signature:</Text>
                        <View style={styles.signatureArea}>
                            <Text style={styles.signatureValue}>(Required if under 18)</Text>
                        </View>
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
