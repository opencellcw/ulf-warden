{{/*
Create the name of the service account to use
*/}}
{{- define "coordinator.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default "coordinator" .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}
