<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; color: #142033;">
    <h2>Lead baru dari landing page HunianID</h2>
    <table cellpadding="6" style="border-collapse: collapse;">
        <tr>
            <td><strong>Nama</strong></td>
            <td>{{ $submission->name }}</td>
        </tr>
        <tr>
            <td><strong>Email</strong></td>
            <td>{{ $submission->email }}</td>
        </tr>
        @if ($submission->phone)
        <tr>
            <td><strong>Telepon</strong></td>
            <td>{{ $submission->phone }}</td>
        </tr>
        @endif
        @if ($submission->company_or_area_name)
        <tr>
            <td><strong>RT / Perumahan</strong></td>
            <td>{{ $submission->company_or_area_name }}</td>
        </tr>
        @endif
        @if ($submission->plan_interest)
        <tr>
            <td><strong>Paket diminati</strong></td>
            <td>{{ $submission->plan_interest }}</td>
        </tr>
        @endif
    </table>
    @if ($submission->message)
    <p><strong>Pesan:</strong></p>
    <p>{{ $submission->message }}</p>
    @endif
</body>
</html>
