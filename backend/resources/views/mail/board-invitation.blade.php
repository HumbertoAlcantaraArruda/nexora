<x-mail::message>
# Olá, {{ $inviteeName }}!

**{{ $inviterName }}** convidou você para o quadro **{{ $boardName }}** na Nexora. Se aceitar, você {{ $roleLabel }}.

@if ($boardDescription)
> {{ $boardDescription }}
@endif

<x-mail::button :url="$url">
Ver convite
</x-mail::button>

No convite você escolhe se quer **aceitar** ou **recusar**. Enquanto não aceitar, você não tem acesso ao quadro.

Se não esperava este convite, basta recusá-lo ou ignorar este e-mail.

Equipe Nexora
</x-mail::message>
