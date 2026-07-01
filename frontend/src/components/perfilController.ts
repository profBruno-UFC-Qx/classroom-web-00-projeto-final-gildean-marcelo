import { usuarioService } from '@/services/UsuarioService'
import { pedidoService, SituacaoPedido } from '@/services/PedidoService'
import { getUsuarioLogado, setUsuarioLogado, verificarAcessoRestrito } from '@/utils/auth'
import { formatarMoeda, formatarData, showModal, formatarWhatsApp, apenasDigitos } from '@/utils/ui'

if (!(await verificarAcessoRestrito())) {
  throw new Error('Acesso negado');
}

const inputNome = document.querySelector<HTMLInputElement>('#perfil-nome')
const inputEmail = document.querySelector<HTMLInputElement>('#perfil-email')
const inputTelefone = document.querySelector<HTMLInputElement>('#perfil-telefone')
const inputEndereco = document.querySelector<HTMLInputElement>('#perfil-endereco')
const btnEdit = document.querySelector<HTMLButtonElement>('.btn-edit')
const btnCancelEdit = document.querySelector<HTMLButtonElement>('#btn-cancel-edit')
const historicoLista = document.querySelector<HTMLUListElement>('.historico-lista')
const historicoEmptyState = document.getElementById('historico-empty-state')

const passwordFields = document.getElementById('password-fields')
const inputSenha = document.querySelector<HTMLInputElement>('#perfil-senha')
const inputSenhaConfirm = document.querySelector<HTMLInputElement>('#perfil-senha-confirm')

const avatarImagem = document.querySelector<HTMLImageElement>('#avatar-imagem')
const inputFoto = document.querySelector<HTMLInputElement>('#perfil-foto-input')
const btnEditFoto = document.querySelector<HTMLButtonElement>('#btn-edit-foto')

let isEditing = false
let novaFotoBase64: string | null = null
async function init() {

  await carregarDadosUsuario()
  await carregarHistoricoPedidos()

  if (btnEdit) {
    btnEdit.addEventListener('click', toggleEditMode)
  }

  if (btnCancelEdit) {
    btnCancelEdit.addEventListener('click', cancelEditMode)
  }

  if (inputTelefone) {
    inputTelefone.addEventListener('input', () => {
      inputTelefone.value = formatarWhatsApp(inputTelefone.value)
    })
  }

  if (btnEditFoto && inputFoto) {
    btnEditFoto.addEventListener('click', () => inputFoto.click())
    inputFoto.addEventListener('change', handleFotoUpload)
  }
}

function handleFotoUpload(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result && avatarImagem) {
        novaFotoBase64 = e.target.result as string
        avatarImagem.src = novaFotoBase64
      }
    }
    reader.readAsDataURL(file)
  }
}

async function carregarDadosUsuario() {
  const user = getUsuarioLogado()
  if (!user) return

  if (inputNome) inputNome.value = user.username || ''
  if (inputEmail) inputEmail.value = user.email || ''
  if (inputTelefone) inputTelefone.value = user.whatsapp ? formatarWhatsApp(user.whatsapp) : ''
  if (inputEndereco) inputEndereco.value = user.endereco || ''
  if (avatarImagem && (user as any).foto) {
    avatarImagem.src = (user as any).foto
  }
}

async function carregarHistoricoPedidos() {
  if (!historicoLista) return

  const user = getUsuarioLogado()
  if (!user) return

  try {
    const response = await pedidoService.listByUsuario(
      (user as any).documentId || user.id,
      { pagination: { pageSize: 10 } }
    )
    const pedidos = response.data

    const linkMobile = document.querySelector<HTMLAnchorElement>('.historico-card_link-mobile')
    const linkDesktop = document.querySelector<HTMLAnchorElement>('.historico-card_link-desktop')

    if (pedidos.length === 0) {
      if (historicoEmptyState) historicoEmptyState.style.display = 'flex'
      if (historicoLista) historicoLista.style.display = 'none'
      if (linkMobile) linkMobile.style.display = 'none'
      if (linkDesktop) linkDesktop.style.display = 'none'
      return
    }

    if (historicoEmptyState) historicoEmptyState.style.display = 'none'
    if (historicoLista) historicoLista.style.display = 'block'
    if (linkMobile) linkMobile.style.display = 'block'
    if (linkDesktop) linkDesktop.style.display = 'inline-block'

    pedidos.forEach(pedido => {
      let situacaoText = 'Desconhecido'
      let badgeClass = ''

      switch (pedido.situacao) {
        case SituacaoPedido.Recebido:
          situacaoText = 'Recebido'
          badgeClass = 'historico-item_badge--recebido'
          break
        case SituacaoPedido.Preparando:
          situacaoText = 'Preparando'
          badgeClass = 'historico-item_badge--preparando'
          break
        case SituacaoPedido.Pronto:
          situacaoText = 'Saiu para Entrega'
          badgeClass = 'historico-item_badge--pronto'
          break
        case SituacaoPedido.Entregue:
          situacaoText = 'Concluído'
          badgeClass = 'historico-item_badge--entregue'
          break
        case SituacaoPedido.Cancelado:
          situacaoText = 'Cancelado'
          badgeClass = 'historico-item_badge--cancelado'
          break
      }

      const li = document.createElement('li')
      li.className = 'historico-item'
      li.style.cursor = 'pointer'
      li.onclick = () => { window.location.href = `status.html?pedido_id=${(pedido as any).documentId || pedido.id}` }

      li.innerHTML = `
        <div class="historico-item_info">
            <h3 class="historico-item_titulo">Pedido #DAN-${pedido.id.toString().padStart(4, '0')}</h3>
            <div class="historico-item_data">
                <i class="ph ph-calendar-blank"></i> ${formatarData(pedido.createdAt)}
            </div>
        </div>
        <div class="historico-item_detalhes">
            <div class="historico-item_valores">
                <span class="historico-item_badge ${badgeClass}">${situacaoText}</span>
                <span class="historico-item_preco">${formatarMoeda(pedido.total)}</span>
            </div>
            <i class="ph ph-caret-right historico-item_seta"></i>
        </div>
      `

      historicoLista.appendChild(li)
    })
  } catch (error) {
    console.error('Erro ao buscar historico:', error)
    historicoLista.innerHTML = '<p>Erro ao buscar histórico de pedidos.</p>'
  }
}

async function toggleEditMode() {
  isEditing = !isEditing

  const inputs = [inputNome, inputTelefone, inputEndereco, inputEmail]

  if (isEditing) {
    inputs.forEach(input => {
      if (input) {
        input.removeAttribute('readonly')
        input.classList.add('perfil-form_input--editing')
      }
    })
    if (passwordFields) passwordFields.style.display = 'block'
    if (btnCancelEdit) btnCancelEdit.style.display = 'block'
    if (btnEditFoto) { btnEditFoto.style.display = 'flex'; btnEditFoto.disabled = false }

    if (inputNome) inputNome.focus()
    if (btnEdit) btnEdit.textContent = 'Salvar'
  } else {
    if (inputNome && inputNome.value.trim().length < 3) {
      await showModal('Erro', 'O nome deve ter pelo menos 3 caracteres.', 'erro', { labelOk: 'OK' })
      isEditing = true
      return
    }

    const updateDto: any = {}
    if (inputNome) updateDto.username = inputNome.value
    if (inputEmail) updateDto.email = inputEmail.value
    if (inputTelefone) updateDto.whatsapp = apenasDigitos(inputTelefone.value)
    if (inputEndereco) updateDto.endereco = inputEndereco.value
    if (novaFotoBase64) updateDto.foto = novaFotoBase64
    if (inputSenha?.value) {
      if (inputSenha.value !== inputSenhaConfirm?.value) {
        await showModal('Erro', 'As senhas não coincidem.', 'erro', { labelOk: 'OK' })
        isEditing = true
        return
      }
      updateDto.password = inputSenha.value
    }

    try {
      const user = getUsuarioLogado()
      if (user) {
        const updatedUser = await usuarioService.update(user.id, updateDto)
        setUsuarioLogado(updatedUser)
      }

      inputs.forEach(input => {
        if (input) {
          input.setAttribute('readonly', 'true')
          input.classList.remove('perfil-form_input--editing')
        }
      })
      if (passwordFields) passwordFields.style.display = 'none'
      if (btnCancelEdit) btnCancelEdit.style.display = 'none'
      if (inputSenha) inputSenha.value = ''
      if (inputSenhaConfirm) inputSenhaConfirm.value = ''
      if (btnEditFoto) { btnEditFoto.style.display = 'none'; btnEditFoto.disabled = true }

      if (btnEdit) btnEdit.textContent = 'Editar'
      await showModal('Sucesso', 'Perfil atualizado com sucesso.', 'sucesso', { labelOk: 'OK' })

    } catch (error: any) {
      console.error('Erro ao atualizar usuário:', error)
      const msg = error.response?.data?.error?.message || 'Não foi possível atualizar o perfil. Verifique se os dados são válidos.'
      await showModal('Erro', msg, 'erro', { labelOk: 'OK' })
      isEditing = true
    }
  }
}

async function cancelEditMode() {
  isEditing = false
  novaFotoBase64 = null

  const inputs = [inputNome, inputTelefone, inputEndereco, inputEmail]

  inputs.forEach(input => {
    if (input) {
      input.setAttribute('readonly', 'true')
      input.classList.remove('perfil-form_input--editing')
    }
  })

  if (passwordFields) passwordFields.style.display = 'none'
  if (btnCancelEdit) btnCancelEdit.style.display = 'none'
  if (inputSenha) inputSenha.value = ''
  if (inputSenhaConfirm) inputSenhaConfirm.value = ''
  if (btnEditFoto) { btnEditFoto.style.display = 'none'; btnEditFoto.disabled = true }
  if (btnEdit) btnEdit.textContent = 'Editar'

  await carregarDadosUsuario()
}

document.addEventListener('DOMContentLoaded', init)
